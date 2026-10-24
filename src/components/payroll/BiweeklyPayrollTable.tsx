import React, { useState } from 'react';
import { BiweeklyPayrollRow, PayrollEmployee } from '../../types/payroll';
import { matchEmployeeName } from '../../services/bodegonPassSync';
import {
  Plus,
  Trash2,
  Banknote,
  Clock,
  ArrowDownRight,
  Wallet,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  rows: BiweeklyPayrollRow[];
  employees?: PayrollEmployee[];
  onRowChange: (index: number, updatedRow: BiweeklyPayrollRow) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  onPrintRowReceipt?: (row: BiweeklyPayrollRow) => void;
  authorizedBy: string;
}

export const BiweeklyPayrollTable: React.FC<Props> = ({
  rows,
  employees,
  onRowChange,
  onAddRow,
  onDeleteRow,
  onPrintRowReceipt,
  authorizedBy,
}) => {
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
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

    if (field === 'totalPaid') {
      onRowChange(index, updated);
      return;
    }

    // Recalcular monto de feriado si cambia salario o cantidad
    if (field === 'baseSalary' || field === 'holidaysCount') {
      const salary = field === 'baseSalary' ? num : (current.baseSalary || 0);
      const count = field === 'holidaysCount' ? num : (current.holidaysCount || 0);
      updated.holidaysAmount = parseFloat(((salary * 2 / 30) * count).toFixed(2));
    }

    // Recalcular Total Pagado
    const inss = Math.abs(updated.inssDeduction !== undefined ? (updated.inssDeduction || 0) : (updated.bonuses || 0));
    const earnings =
      (updated.baseSalary || 0) +
      (updated.overtimeAmount || 0) +
      (updated.holidaysAmount || 0);
    const deductions =
      inss +
      (updated.loanDeduction || 0) +
      (updated.restaurantServiceDeduction || 0) +
      (updated.breakageDeduction || 0);
    updated.totalPaid = parseFloat((earnings - deductions).toFixed(2));

    onRowChange(index, updated);
  };

  // Exportar sábana a formato CSV para Excel
  const handleDownloadCSV = () => {
    const headers = [
      '#',
      'Colaborador',
      'Cargo',
      'Salario Quincenal Base (C$)',
      'Horas Extras (h)',
      'Monto Horas Extras (C$)',
      'Feriados (d)',
      'Monto Feriados (C$)',
      'Deducción INSS (C$)',
      'Deducción Préstamo (C$)',
      'Deducción Restaurante (C$)',
      'Deducción Vajilla/Otro (C$)',
      'Total Deducciones (C$)',
      'TOTAL NETO PAGADO (C$)',
      'Detalle Deducciones / Notas',
    ];

    const lines = rows.map((r, i) => {
      const inssVal = Math.abs(r.inssDeduction !== undefined ? (r.inssDeduction || 0) : (r.bonuses || 0));
      const totalDed =
        inssVal +
        (r.loanDeduction || 0) +
        (r.restaurantServiceDeduction || 0) +
        (r.breakageDeduction || 0);

      return [
        i + 1,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.role || '').replace(/"/g, '""')}"`,
        (r.baseSalary || 0).toFixed(2),
        (r.overtimeHours || 0).toFixed(1),
        (r.overtimeAmount || 0).toFixed(2),
        r.holidaysCount || 0,
        (r.holidaysAmount || 0).toFixed(2),
        inssVal.toFixed(2),
        (r.loanDeduction || 0).toFixed(2),
        (r.restaurantServiceDeduction || 0).toFixed(2),
        (r.breakageDeduction || 0).toFixed(2),
        totalDed.toFixed(2),
        (r.totalPaid || 0).toFixed(2),
        `"${(r.breakageNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Planilla_Bodegon_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Totales de la sábana
  let totalBase = 0;
  let totalHEHours = 0;
  let totalHEAmount = 0;
  let totalHolidaysCount = 0;
  let totalHolidaysAmount = 0;
  let totalINSS = 0;
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
    totalINSS += Math.abs(r.inssDeduction !== undefined ? (r.inssDeduction || 0) : (r.bonuses || 0));
    totalLoans += r.loanDeduction || 0;
    totalRest += r.restaurantServiceDeduction || 0;
    totalBreakage += r.breakageDeduction || 0;
    grandTotal += r.totalPaid || 0;
  });

  const totalDeductions = totalINSS + totalLoans + totalRest + totalBreakage;
  const totalExtras = totalHEAmount + totalHolidaysAmount;

  return (
    <div className="space-y-3">
      {/* 4 Tarjetas de Resumen Financiero: Diseño Rectangular Corporativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 border border-stone-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">
              Total Salario Base
            </span>
            <span className="p-1 border border-bodegon/35 bg-bodegon/5 text-bodegon">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-stone-900 font-mono">
            <span className="text-xs text-stone-400 font-bold mr-1">C$</span>
            {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-stone-500 font-medium">{rows.length} colaboradores activos</span>
        </div>

        <div className="p-3 border border-stone-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-dorado-tinta uppercase tracking-wider">
              Total Extras & Feriados
            </span>
            <span className="p-1 border border-dorado/60 bg-dorado/10 text-dorado-tinta">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-cafe font-mono">
            <span className="text-xs text-dorado-tinta font-bold mr-1">C$</span>
            {totalExtras.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-stone-500 font-medium">H.E ({totalHEHours.toFixed(1)}h) + {totalHolidaysCount} feriados</span>
        </div>

        <div className="p-3 border border-stone-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-barro uppercase tracking-wider">
              Total Deducciones
            </span>
            <span className="p-1 border border-barro/40 bg-barro/5 text-barro">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-barro font-mono">
            <span className="text-xs text-barro font-bold mr-1">- C$</span>
            {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-stone-500 font-medium">INSS, préstamos, consumos y vajillas</span>
        </div>

        <div className="p-3 border-2 border-bodegon bg-bodegon/2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-bodegon uppercase tracking-wider">
              Total Neto a Desembolsar
            </span>
            <span className="p-1 bg-bodegon text-white">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-bodegon font-mono">
            <span className="text-xs text-bodegon/70 font-bold mr-1">C$</span>
            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-bodegon font-bold uppercase tracking-wide">Desembolso quincenal oficial</span>
        </div>
      </div>

      {/* Barra de Acciones de la Sábana: Botones Rectangulares Corporativos */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="text-xs font-bold text-stone-800 flex items-center gap-2">
          <span className="uppercase tracking-wider">Sábana Contable Quincenal</span>
          <span className="text-[10px] font-normal text-stone-500">• Todas las celdas son editables directamente</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Descargar CSV / Excel */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Exportar sábana actual a archivo CSV para Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-bodegon" />
            <span>Exportar CSV</span>
          </button>

          {/* Botón Agregar Colaborador */}
          {onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="px-3.5 py-1.5 border border-bodegon-noche bg-bodegon hover:bg-bodegon-noche text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Sábana de Planilla Quincenal: Diseño Rectangular Formal */}
      <div className="border border-stone-300 bg-white overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-800 font-extrabold border-b border-stone-300 text-[11px] uppercase tracking-wider">
              <th
                rowSpan={2}
                className="sticky left-0 z-30 py-2.5 px-2 text-center w-[42px] min-w-[42px] max-w-[42px] border-r border-stone-300 align-middle bg-stone-100 shadow-[1px_0_0_0_#cbd5e1]"
              >
                #
              </th>
              <th
                rowSpan={2}
                className="sticky left-[42px] z-30 py-2.5 px-3 min-w-[210px] border-r-2 border-stone-300 align-middle bg-stone-100 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]"
              >
                Colaborador
              </th>
              <th rowSpan={2} className="py-2.5 px-2 min-w-[120px] border-r border-stone-300 align-middle">Cargo</th>
              <th rowSpan={2} className="py-2.5 px-3 min-w-[120px] text-right border-r border-stone-300 bg-bodegon/4 align-middle text-bodegon-noche font-bold">Salario Q. (C$)</th>
              <th colSpan={2} className="py-2 px-2 text-center border-r border-stone-300 bg-dorado/14 text-cafe align-middle font-black text-[11px] tracking-wider">Horas Extras</th>
              <th colSpan={2} className="py-2 px-2 text-center border-r border-stone-300 bg-stone-100/70 text-stone-950 align-middle font-black text-[11px] tracking-wider">Feriados</th>
              <th rowSpan={2} className="py-2.5 px-2 min-w-[95px] text-right border-r border-stone-300 bg-barro/4 text-barro align-middle font-black text-[11px] tracking-wider">Ded. INSS (C$)</th>
              <th colSpan={3} className="py-2 px-2 text-center border-r border-stone-300 bg-barro/7 text-barro align-middle font-black text-[11px] tracking-wider">Deducciones (C$)</th>
              <th rowSpan={2} className="py-2.5 px-3 min-w-[130px] text-right border-r border-stone-300 bg-stone-900 text-white font-bold align-middle">TOTAL PAGADO (C$)</th>
              <th rowSpan={2} className="py-2.5 px-3 min-w-[160px] border-r border-stone-300 align-middle">Concepto / Detalle Deducción</th>
              <th rowSpan={2} className="py-2.5 px-2 text-center w-20 align-middle">Acciones</th>
            </tr>
            <tr className="bg-stone-50 text-[10px] font-bold text-stone-700 border-b border-stone-300 uppercase">
              <th className="py-1 px-1 text-center w-16 border-r border-stone-300 align-middle bg-dorado/5">Cant. (h)</th>
              <th className="py-1 px-2 text-right w-24 border-r border-stone-300 align-middle bg-dorado/5">Monto C$</th>
              <th className="py-1 px-1 text-center w-16 border-r border-stone-300 align-middle bg-stone-50/50">Cant. (d)</th>
              <th className="py-1 px-2 text-right w-24 border-r border-stone-300 align-middle bg-stone-50/50">Monto C$</th>
              <th className="py-1 px-2 text-right w-22 border-r border-stone-300 align-middle bg-barro/2">Préstamo</th>
              <th className="py-1 px-2 text-right w-22 border-r border-stone-300 align-middle bg-barro/2">Serv. Rest</th>
              <th className="py-1 px-2 text-right w-22 border-r border-stone-300 align-middle bg-barro/2">Vajilla/Otro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.map((row, idx) => {
              const isRowActive = activeRowIdx === idx;
              const isInsured = employees?.some(
                (e) => (e.id === row.employeeId || matchEmployeeName(e.name, row.name)) && e.isInsuredINSS
              );
              const inssVal = Math.abs(row.inssDeduction !== undefined ? (row.inssDeduction || 0) : (row.bonuses || 0));
              const rowDeductions =
                inssVal +
                (row.loanDeduction || 0) +
                (row.restaurantServiceDeduction || 0) +
                (row.breakageDeduction || 0);

              const deductionPct =
                (row.baseSalary && row.baseSalary > 0)
                  ? Math.round((rowDeductions / row.baseSalary) * 100)
                  : 0;

              const isHighDeduction = deductionPct >= 40;
              const isNegativeOrZero = row.totalPaid <= 0 && (row.baseSalary || 0) > 0;

              return (
                <tr
                  key={row.employeeId || idx}
                  onClick={() => setActiveRowIdx(idx)}
                  onFocus={() => setActiveRowIdx(idx)}
                  className={`${
                    isRowActive ? 'bg-dorado/7 ring-1 ring-dorado/60' : 'hover:bg-stone-50/90'
                  } transition-colors`}
                >
                  <td
                    className={`sticky left-0 z-10 w-[42px] min-w-[42px] max-w-[42px] p-1.5 text-center font-mono text-[11px] border-r border-stone-200 shadow-[1px_0_0_0_#e2e8f0] ${
                      isRowActive ? 'bg-dorado/18 text-cafe font-black' : 'bg-stone-50/95 text-stone-500'
                    }`}
                  >
                    {idx + 1}
                  </td>

                  {/* Nombre Colaborador (Fijo a la izquierda + Badge Asegurado) */}
                  <td
                    className={`sticky left-[42px] z-10 p-1.5 border-r-2 border-stone-300 min-w-[210px] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] ${
                      isRowActive ? 'bg-dorado/10' : 'bg-white'
                    }`}
                  >
                    <div>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleTextChange(idx, 'name', e.target.value)}
                        className="w-full font-bold text-stone-900 bg-transparent border border-transparent hover:border-stone-300 focus:border-stone-600 focus:bg-white px-1.5 py-0.5 text-xs outline-none transition"
                        placeholder="Nombre colaborador..."
                      />
                      <div className="flex flex-wrap items-center gap-1 mt-0.5 px-1">
                        {/* Etiqueta ASEGURADO INSS */}
                        {isInsured && (
                          <span
                            className="inline-flex items-center gap-1 border border-stone-200 bg-stone-50 text-stone-700 text-[9px] font-bold uppercase px-1.5 py-0.2 tracking-wider rounded-xs shadow-2xs"
                            title="Colaborador cotizante inscrito en la Planilla Especial del Seguro Social (INSS)"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 text-stone-600" />
                            <span>Asegurado</span>
                          </span>
                        )}

                        {/* Alerta Rectangular de Límite de Endeudamiento */}
                        {isHighDeduction && (
                          <div
                            className="inline-flex items-center gap-1 border border-dorado bg-dorado/10 text-cafe text-[9px] font-mono font-bold uppercase px-1 py-0.2"
                            title={`Deducciones representan el ${deductionPct}% del salario base quincenal`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-dorado-tinta" />
                            <span>ALERTA DED: {deductionPct}%</span>
                          </div>
                        )}
                        {isNegativeOrZero && (
                          <div
                            className="inline-flex items-center gap-1 border border-barro bg-barro/5 text-barro text-[9px] font-mono font-bold uppercase px-1 py-0.2"
                            title="El neto a pagar es cero o negativo tras las deducciones aplicadas"
                          >
                            <span>NETO ≤ C$ 0</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cargo (Editable Inline) */}
                  <td className="p-1 border-r border-stone-200">
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) => handleTextChange(idx, 'role', e.target.value)}
                      className="w-full text-stone-700 font-medium bg-transparent border border-transparent hover:border-stone-300 focus:border-stone-600 focus:bg-white px-1.5 py-1 text-xs outline-none transition"
                      placeholder="Cargo..."
                    />
                  </td>

                  {/* Salario Quincenal Señalizado en Dinero */}
                  <td className="p-1 border-r border-stone-200 bg-bodegon/2">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-bodegon">
                      <span className="text-[10px] font-bold text-bodegon select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={row.baseSalary || ''}
                        onChange={(e) => handleNumChange(idx, 'baseSalary', e.target.value)}
                        className="w-20 text-right font-mono font-bold text-bodegon-noche bg-transparent outline-none text-xs"
                        placeholder="0.00"
                      />
                    </div>
                  </td>

                  {/* Horas Extras: Cantidad */}
                  <td className="p-1 border-r border-stone-200">
                    <div className="flex items-center justify-center bg-white border border-stone-300 px-1 py-0.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={row.overtimeHours || ''}
                        onChange={(e) => handleNumChange(idx, 'overtimeHours', e.target.value)}
                        className="w-10 text-center font-mono font-bold text-stone-800 bg-transparent outline-none text-xs"
                      />
                      <span className="text-[9px] font-bold text-dorado-tinta select-none ml-0.5">h</span>
                    </div>
                  </td>

                  {/* Horas Extras: Valor Señalizado */}
                  <td className="p-1 border-r border-stone-200">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-dorado">
                      <span className="text-[10px] font-bold text-dorado-tinta select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.overtimeAmount || ''}
                        onChange={(e) => handleNumChange(idx, 'overtimeAmount', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-stone-900 bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Feriados: Cantidad */}
                  <td className="p-1 border-r border-stone-200">
                    <div className="flex items-center justify-center bg-white border border-stone-300 px-1 py-0.5">
                      <input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={row.holidaysCount || ''}
                        onChange={(e) => handleNumChange(idx, 'holidaysCount', e.target.value)}
                        className="w-8 text-center font-mono font-bold text-stone-800 bg-transparent outline-none text-xs"
                      />
                      <span className="text-[9px] font-bold text-stone-700 select-none ml-0.5">d</span>
                    </div>
                  </td>

                  {/* Feriados: Valor Señalizado */}
                  <td className="p-1 border-r border-stone-200">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-stone-600">
                      <span className="text-[10px] font-bold text-stone-700 select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.holidaysAmount || ''}
                        onChange={(e) => handleNumChange(idx, 'holidaysAmount', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-stone-900 bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Deducción: INSS Señalizada en Rojo (Resta del Neto) */}
                  <td className="p-1 border-r border-stone-200 bg-barro/2">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-barro">
                      <span className="text-[10px] font-bold text-barro select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.inssDeduction !== undefined ? (row.inssDeduction || '') : (row.bonuses || '')}
                        onChange={(e) => handleNumChange(idx, 'inssDeduction', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-barro bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Deducción: Préstamo Señalizada en Rojo */}
                  <td className="p-1 border-r border-stone-200 bg-barro/2">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-barro">
                      <span className="text-[10px] font-bold text-barro select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.loanDeduction || ''}
                        onChange={(e) => handleNumChange(idx, 'loanDeduction', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-barro bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Deducción: Servicio Restaurante */}
                  <td className="p-1 border-r border-stone-200 bg-barro/2">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-barro">
                      <span className="text-[10px] font-bold text-barro select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.restaurantServiceDeduction || ''}
                        onChange={(e) => handleNumChange(idx, 'restaurantServiceDeduction', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-barro bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Deducción: Vajilla / Otros */}
                  <td className="p-1 border-r border-stone-200 bg-barro/2">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-barro">
                      <span className="text-[10px] font-bold text-barro select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.breakageDeduction || ''}
                        onChange={(e) => handleNumChange(idx, 'breakageDeduction', e.target.value)}
                        className="w-16 text-right font-mono font-bold text-barro bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* TOTAL PAGADO (Calculado Automático y 100% Editable) */}
                  <td className="p-1 border-r border-stone-200 bg-stone-50">
                    <div className="flex items-center justify-end bg-white border border-stone-300 px-1.5 py-0.5 focus-within:border-stone-900">
                      <span className="text-[10px] text-stone-400 font-bold select-none mr-1">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.totalPaid ?? ''}
                        onChange={(e) => handleNumChange(idx, 'totalPaid', e.target.value)}
                        className="w-20 text-right font-mono font-black text-stone-900 bg-transparent outline-none text-[12px]"
                      />
                    </div>
                  </td>

                  {/* Nota / Detalle de deducción */}
                  <td className="p-1 border-r border-stone-200">
                    <input
                      type="text"
                      placeholder="Ej: Cuota préstamo, reposición..."
                      value={row.breakageNotes || ''}
                      onChange={(e) => handleTextChange(idx, 'breakageNotes', e.target.value)}
                      className="w-full text-xs text-stone-700 placeholder:text-stone-400 bg-transparent border border-transparent hover:border-stone-300 focus:border-stone-600 focus:bg-white px-2 py-1 outline-none transition"
                    />
                  </td>

                  {/* Acciones: Imprimir Comprobante Carta y Eliminar */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Botón Comprobante Individual en Hoja Carta */}
                      {onPrintRowReceipt && (
                        <button
                          type="button"
                          onClick={() => onPrintRowReceipt(row)}
                          className="p-1 text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
                          title="Imprimir comprobante individual de pago en Hoja Tamaño Carta (B/N)"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botón Eliminar Fila */}
                      {onDeleteRow && (
                        <button
                          type="button"
                          onClick={() => onDeleteRow(idx)}
                          className="p-1 text-stone-400 hover:text-barro hover:bg-barro/5 border border-stone-200 transition cursor-pointer"
                          title="Quitar de esta quincena"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-stone-900 text-white font-black text-xs border-t-2 border-stone-900">
              <td className="sticky left-0 z-10 w-[42px] min-w-[42px] max-w-[42px] p-2.5 bg-stone-900 border-r border-stone-700"></td>
              <td className="sticky left-[42px] z-10 min-w-[210px] p-2.5 uppercase tracking-wider bg-stone-900 border-r-2 border-stone-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)] font-bold">
                Totales Generales
              </td>
              <td className="p-2.5 bg-stone-900 border-r border-stone-800"></td>
              <td className="p-2.5 text-right font-mono text-[#CFE3DC]">C$ {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="p-2.5 text-center font-mono">{totalHEHours ? `${totalHEHours.toFixed(1)}h` : '-'}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHEAmount.toFixed(2)}</td>
              <td className="p-2.5 text-center font-mono">{totalHolidaysCount ? `${totalHolidaysCount}d` : '-'}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHolidaysAmount.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-[#F3C9BF]">- C$ {totalINSS.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-[#F3C9BF]">- C$ {totalLoans.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-[#F3C9BF]">- C$ {totalRest.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-[#F3C9BF]">- C$ {totalBreakage.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-dorado-vivo text-sm">
                C$ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className="p-2.5 text-stone-300 text-[10px] italic">
                {rows.length} colaboradores incluidos • Autoriza: {authorizedBy}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
