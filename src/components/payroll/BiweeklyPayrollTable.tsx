import React from 'react';
import { BiweeklyPayrollRow } from '../../types/payroll';
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
} from 'lucide-react';

interface Props {
  rows: BiweeklyPayrollRow[];
  onRowChange: (index: number, updatedRow: BiweeklyPayrollRow) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  onPrintRowReceipt?: (row: BiweeklyPayrollRow) => void;
  authorizedBy: string;
}

export const BiweeklyPayrollTable: React.FC<Props> = ({
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
  onPrintRowReceipt,
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

    // Recalcular monto de feriado si cambia salario o cantidad
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
      'Bonificaciones (C$)',
      'Deducción Préstamo (C$)',
      'Deducción Restaurante (C$)',
      'Deducción Vajilla/Otro (C$)',
      'Total Deducciones (C$)',
      'TOTAL NETO PAGADO (C$)',
      'Detalle Deducciones / Notas',
    ];

    const lines = rows.map((r, i) => {
      const totalDed =
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
        (r.bonuses || 0).toFixed(2),
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
    <div className="space-y-3">
      {/* 4 Tarjetas de Resumen Financiero: Diseño Rectangular Corporativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 border border-slate-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Total Salario Base
            </span>
            <span className="p-1 border border-emerald-300 bg-emerald-50 text-emerald-800">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            <span className="text-xs text-slate-400 font-bold mr-1">C$</span>
            {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{rows.length} colaboradores activos</span>
        </div>

        <div className="p-3 border border-slate-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Total Extras & Feriados
            </span>
            <span className="p-1 border border-amber-300 bg-amber-50 text-amber-800">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-amber-900 font-mono">
            <span className="text-xs text-amber-600 font-bold mr-1">C$</span>
            {totalExtras.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">H.E ({totalHEHours.toFixed(1)}h) + {totalHolidaysCount} feriados</span>
        </div>

        <div className="p-3 border border-slate-300 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              Total Deducciones
            </span>
            <span className="p-1 border border-rose-300 bg-rose-50 text-rose-700">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-rose-800 font-mono">
            <span className="text-xs text-rose-400 font-bold mr-1">- C$</span>
            {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Préstamos, consumos y vajillas</span>
        </div>

        <div className="p-3 border-2 border-[#1c6856] bg-emerald-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#1c6856] uppercase tracking-wider">
              Total Neto a Desembolsar
            </span>
            <span className="p-1 bg-[#1c6856] text-white">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-[#1c6856] font-mono">
            <span className="text-xs text-[#1c6856]/70 font-bold mr-1">C$</span>
            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#1c6856] font-bold uppercase tracking-wide">Desembolso quincenal oficial</span>
        </div>
      </div>

      {/* Barra de Acciones de la Sábana: Botones Rectangulares Corporativos */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span className="uppercase tracking-wider">Sábana Contable Quincenal</span>
          <span className="text-[10px] font-normal text-slate-500">• Todas las celdas son editables directamente</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Descargar CSV / Excel */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Exportar sábana actual a archivo CSV para Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Exportar CSV</span>
          </button>

          {/* Botón Agregar Colaborador */}
          {onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="px-3.5 py-1.5 border border-[#165345] bg-[#1c6856] hover:bg-[#165345] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Sábana de Planilla Quincenal: Diseño Rectangular Formal */}
      <div className="border border-slate-300 bg-white overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[11px] uppercase tracking-wider">
              <th rowSpan={2} className="p-2 text-center w-10 border-r border-slate-300">#</th>
              <th rowSpan={2} className="p-2 min-w-[170px] border-r border-slate-300">Colaborador</th>
              <th rowSpan={2} className="p-2 min-w-[120px] border-r border-slate-300">Cargo</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right border-r border-slate-300 bg-emerald-50/60">Salario Q. (C$)</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-300 bg-amber-50/60">Horas Extras</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-300 bg-blue-50/60">Feriados</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-right border-r border-slate-300">Bonif. (C$)</th>
              <th colSpan={3} className="p-1.5 text-center border-r border-slate-300 bg-rose-50/60">Deducciones (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[130px] text-right border-r border-slate-300 bg-slate-900 text-white font-bold">TOTAL PAGADO (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[160px] border-r border-slate-300">Concepto / Detalle Deducción</th>
              <th rowSpan={2} className="p-2 text-center w-20">Acciones</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 border-b border-slate-300 uppercase">
              <th className="p-1 text-center w-16 border-r border-slate-300">Cant. (h)</th>
              <th className="p-1 text-right w-24 border-r border-slate-300">Monto C$</th>
              <th className="p-1 text-center w-16 border-r border-slate-300">Cant. (d)</th>
              <th className="p-1 text-right w-24 border-r border-slate-300">Monto C$</th>
              <th className="p-1 text-right w-22 border-r border-slate-300">Préstamo</th>
              <th className="p-1 text-right w-22 border-r border-slate-300">Serv. Rest</th>
              <th className="p-1 text-right w-22 border-r border-slate-300">Vajilla/Otro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, idx) => {
              const rowDeductions =
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
                <tr key={row.employeeId || idx} className="hover:bg-slate-50/90 transition-colors">
                  <td className="p-1.5 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200 bg-slate-50/50">
                    {idx + 1}
                  </td>

                  {/* Nombre Colaborador (Editable Inline) */}
                  <td className="p-1 border-r border-slate-200">
                    <div>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleTextChange(idx, 'name', e.target.value)}
                        className="w-full font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-600 focus:bg-white px-1.5 py-1 text-xs outline-none transition"
                        placeholder="Nombre colaborador..."
                      />
                      {/* Alerta Rectangular de Límite de Endeudamiento */}
                      {isHighDeduction && (
                        <div
                          className="mt-0.5 inline-flex items-center gap-1 border border-amber-600 bg-amber-50 text-amber-900 text-[9px] font-mono font-bold uppercase px-1 py-0.2"
                          title={`Deducciones representan el ${deductionPct}% del salario base quincenal`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          <span>ALERTA DEDUCCIÓN: {deductionPct}%</span>
                        </div>
                      )}
                      {isNegativeOrZero && (
                        <div
                          className="mt-0.5 inline-flex items-center gap-1 border border-rose-600 bg-rose-50 text-rose-800 text-[9px] font-mono font-bold uppercase px-1 py-0.2 ml-1"
                          title="El neto a pagar es cero o negativo tras las deducciones aplicadas"
                        >
                          <span>NETO ≤ C$ 0</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Cargo (Editable Inline) */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) => handleTextChange(idx, 'role', e.target.value)}
                      className="w-full text-slate-700 font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-600 focus:bg-white px-1.5 py-1 text-xs outline-none transition"
                      placeholder="Cargo..."
                    />
                  </td>

                  {/* Salario Quincenal Señalizado en Dinero */}
                  <td className="p-1 border-r border-slate-200 bg-emerald-50/20">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-emerald-700">
                      <span className="text-[10px] font-bold text-emerald-800 select-none mr-1">C$</span>
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
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-center bg-white border border-slate-300 px-1 py-0.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={row.overtimeHours || ''}
                        onChange={(e) => handleNumChange(idx, 'overtimeHours', e.target.value)}
                        className="w-10 text-center font-mono font-bold text-slate-800 bg-transparent outline-none text-xs"
                      />
                      <span className="text-[9px] font-bold text-amber-700 select-none ml-0.5">h</span>
                    </div>
                  </td>

                  {/* Horas Extras: Valor Señalizado */}
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-amber-600">
                      <span className="text-[10px] font-bold text-amber-700 select-none mr-1">C$</span>
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
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-center bg-white border border-slate-300 px-1 py-0.5">
                      <input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={row.holidaysCount || ''}
                        onChange={(e) => handleNumChange(idx, 'holidaysCount', e.target.value)}
                        className="w-8 text-center font-mono font-bold text-slate-800 bg-transparent outline-none text-xs"
                      />
                      <span className="text-[9px] font-bold text-blue-700 select-none ml-0.5">d</span>
                    </div>
                  </td>

                  {/* Feriados: Valor Señalizado */}
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-blue-600">
                      <span className="text-[10px] font-bold text-blue-700 select-none mr-1">C$</span>
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
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-slate-600">
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
                  <td className="p-1 border-r border-slate-200 bg-rose-50/20">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-rose-600">
                      <span className="text-[10px] font-bold text-rose-600 select-none mr-1">C$</span>
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
                  <td className="p-1 border-r border-slate-200 bg-rose-50/20">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-rose-600">
                      <span className="text-[10px] font-bold text-rose-600 select-none mr-1">C$</span>
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
                  <td className="p-1 border-r border-slate-200 bg-rose-50/20">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-rose-600">
                      <span className="text-[10px] font-bold text-rose-600 select-none mr-1">C$</span>
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
                  <td className="p-1.5 text-right border-r border-slate-200 font-mono font-black text-slate-900 bg-slate-50 text-[12px] whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                    {row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Nota / Detalle de deducción */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="Ej: Cuota préstamo, reposición..."
                      value={row.breakageNotes || ''}
                      onChange={(e) => handleTextChange(idx, 'breakageNotes', e.target.value)}
                      className="w-full text-xs text-slate-700 placeholder:text-slate-400 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-600 focus:bg-white px-2 py-1 outline-none transition"
                    />
                  </td>

                  {/* Acciones: Imprimir Recibo Térmico y Eliminar */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Botón Comprobante Térmico Individual */}
                      {onPrintRowReceipt && (
                        <button
                          type="button"
                          onClick={() => onPrintRowReceipt(row)}
                          className="p-1 text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                          title="Imprimir recibo térmico de pago 80mm para este colaborador"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botón Eliminar Fila */}
                      {onDeleteRow && (
                        <button
                          type="button"
                          onClick={() => onDeleteRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
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
              <td colSpan={2} className="p-2.5 text-slate-300 text-[10px] italic">
                {rows.length} colaboradores incluidos • Autoriza: {authorizedBy}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
