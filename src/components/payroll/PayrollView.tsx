import React, { useState, useEffect, useMemo } from 'react';
import { AppState } from '../../types';
import {
  PayrollPeriod,
  BiweeklyPayrollRow,
  SpecialPayrollRow,
  PayrollIncident,
  PayrollEmployee,
  BiweeklyPayrollRecord,
} from '../../types/payroll';
import { BiweeklyPayrollTable } from './BiweeklyPayrollTable';
import { SpecialPayrollTable } from './SpecialPayrollTable';
import { PayrollIncidentsView } from './PayrollIncidentsView';
import { PayrollEmployeesModal } from './PayrollEmployeesModal';
import {
  printBiweeklyPayrollGeneral,
  printIndividualReceipts,
  printSpecialPayrollINSS,
} from '../../services/payrollPrint';
import { printThermalIndividualPayrollReceipt } from '../../services/thermalPrint';
import { exportPayrollToExcel } from '../../services/payrollExcelExport';
import {
  syncFromBodegonPass,
  matchEmployeeName,
  testBodegonPassConnection,
  DEFAULT_BODEGON_PASS_URL,
} from '../../services/bodegonPassSync';
import {
  Calendar,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Users,
  ChevronDown,
  Check,
  Building2,
  UtensilsCrossed,
  Save,
  Settings,
  Globe,
  X,
  Copy,
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  subTab?: 'quincenal' | 'especial' | 'incidencias';
  onSubTabChange?: (tab: 'quincenal' | 'especial' | 'incidencias') => void;
}

export const PayrollView: React.FC<Props> = ({
  state,
  onUpdateState,
  subTab: externalSubTab,
  onSubTabChange: externalOnSubTabChange,
}) => {
  // Pestaña activa (si no viene por prop, usar estado interno)
  const [internalSubTab, setInternalSubTab] = useState<'quincenal' | 'especial' | 'incidencias'>('quincenal');
  const activeSubTab = externalSubTab || internalSubTab;
  const setActiveSubTab = (tab: 'quincenal' | 'especial' | 'incidencias') => {
    setInternalSubTab(tab);
    externalOnSubTabChange?.(tab);
  };

  // Selector de período
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [period, setPeriod] = useState<PayrollPeriod>(now.getDate() <= 15 ? 'FIRST_HALF' : 'SECOND_HALF');

  // Modal de Empleados
  const [employeesModalOpen, setEmployeesModalOpen] = useState(false);
  // Modal de Configuración de Bodegón Pass
  const [passConfigOpen, setPassConfigOpen] = useState(false);
  const [passUrlInput, setPassUrlInput] = useState(state.bodegonPassUrl || DEFAULT_BODEGON_PASS_URL);
  const [testingPass, setTestingPass] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Dropdown de impresión
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  // Estado de sincronización
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Sincronizar input de URL si cambia en el estado
  useEffect(() => {
    if (state.bodegonPassUrl) {
      setPassUrlInput(state.bodegonPassUrl);
    }
  }, [state.bodegonPassUrl]);

  // ID del período actual
  const currentPeriodId = `${year}-${String(month).padStart(2, '0')}-${period}`;

  // Rango de fechas del período (YYYY-MM-DD)
  const { startDate, endDate } = useMemo(() => {
    const yStr = String(year);
    const mStr = String(month).padStart(2, '0');
    if (period === 'FIRST_HALF') {
      return {
        startDate: `${yStr}-${mStr}-01`,
        endDate: `${yStr}-${mStr}-15`,
      };
    } else {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        startDate: `${yStr}-${mStr}-16`,
        endDate: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }
  }, [year, month, period]);

  // Construir filas operativas y especiales a partir del historial o de los empleados actuales
  const [rows, setRows] = useState<BiweeklyPayrollRow[]>([]);
  const [specialRows, setSpecialRows] = useState<SpecialPayrollRow[]>([]);

  // Inicializar o recargar filas cuando cambia el período o la lista de empleados
  useEffect(() => {
    const existing = (state.payrollHistory || []).find((h) => h.id === currentPeriodId);

    if (existing && existing.rows && existing.rows.length > 0) {
      // Saneamiento estricto de filas del historial: descartar Maverick/Sandor y sincronizar nombres oficiales
      const isExcluded = (n: string) => {
        const s = (n || '').toLowerCase();
        return s.includes('maverick') || s.includes('sandor');
      };

      const sanitizedRows = existing.rows
        .filter((r) => !isExcluded(r.name))
        .map((r) => {
          const emp = (state.payrollEmployees || []).find((e) => matchEmployeeName(e.name, r.name));
          return emp ? { ...r, name: emp.name, role: emp.role } : r;
        });

      const sanitizedSpecialRows = (existing.specialRows || [])
        .filter((sr) => !isExcluded(sr.name))
        .map((sr) => {
          const emp = (state.payrollEmployees || []).find((e) => matchEmployeeName(e.name, sr.name));
          return emp
            ? {
                ...sr,
                name: emp.name,
                role: emp.role,
                nss: emp.nss || sr.nss,
                hireDate: emp.hireDate || sr.hireDate,
              }
            : sr;
        });

      setRows(sanitizedRows);
      setSpecialRows(sanitizedSpecialRows);
    } else {
      // Generar filas nuevas calculando incidencias de la bitácora en ese rango
      const activeEmps = (state.payrollEmployees || []).filter((e) => e.isActive);

      const newRows: BiweeklyPayrollRow[] = activeEmps.map((emp) => {
        // Filtrar incidencias de este empleado en la quincena seleccionada
        const empIncidents = (state.payrollIncidents || []).filter(
          (inc) => inc.employeeId === emp.id && inc.date >= startDate && inc.date <= endDate
        );

        const restDeduction = empIncidents
          .filter((i) => i.type === 'SERVICIO_RESTAURANTE')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const breakageDeduction = empIncidents
          .filter((i) => i.type === 'VAJILLA_PERDIDA' || i.type === 'OTRO')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const notes = empIncidents.map((i) => `${i.concept}: C$${i.amount}`).join(', ');

        const base = emp.baseSalaryBiweekly || 0;
        const totalEarnings = base;
        const totalDeductions = restDeduction + breakageDeduction;

        return {
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          baseSalary: base,
          overtimeHours: 0,
          overtimeAmount: 0,
          holidaysCount: 0,
          holidaysAmount: 0,
          bonuses: 0,
          loanDeduction: 0,
          restaurantServiceDeduction: restDeduction,
          breakageDeduction: breakageDeduction,
          breakageNotes: notes,
          totalPaid: parseFloat((totalEarnings - totalDeductions).toFixed(2)),
        };
      });

      // Generar filas para la Planilla Especial (INSS)
      const insuredEmps = activeEmps.filter((e) => e.isInsuredINSS);
      const newSpecialRows: SpecialPayrollRow[] = insuredEmps.map((emp) => {
        const sal = emp.reportedSalaryINSS || emp.baseSalaryBiweekly || 5675.04;
        const aguinaldo = parseFloat((sal / 12).toFixed(2));
        const inssLab = parseFloat((sal * 0.07).toFixed(2));
        const inssPat = parseFloat((sal * 0.215).toFixed(2));
        const inatec = parseFloat((sal * 0.02).toFixed(2));
        const cotiz = parseFloat((inssLab + inssPat + inatec).toFixed(2));
        const cost = parseFloat((sal + aguinaldo + inssPat + inatec).toFixed(2));
        const net = parseFloat((sal - inssLab).toFixed(2));

        return {
          employeeId: emp.id,
          nss: emp.nss || '',
          name: emp.name,
          role: emp.role,
          hireDate: emp.hireDate || '2025-11-01',
          reportedSalary: sal,
          extraHolidayAmount: 0,
          aguinaldoProvision: aguinaldo,
          inssLaboral: inssLab,
          inssPatronal: inssPat,
          inatecPatronal: inatec,
          totalCotizacion: cotiz,
          irLaboral: 0,
          totalCostBodegon: cost,
          netPayAsegurado: net,
        };
      });

      setRows(newRows);
      setSpecialRows(newSpecialRows);
    }
  }, [currentPeriodId, state.payrollEmployees, state.payrollIncidents, startDate, endDate]);

  // Manejar cambio en una fila de la sábana quincenal
  const handleRowChange = (index: number, updatedRow: BiweeklyPayrollRow) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = updatedRow;
      return next;
    });
  };

  // Manejar cambio en una fila de la planilla especial INSS
  const handleSpecialRowChange = (index: number, updatedRow: SpecialPayrollRow) => {
    setSpecialRows((prev) => {
      const next = [...prev];
      next[index] = updatedRow;
      return next;
    });
  };

  // Agregar y eliminar colaboradores en la sábana quincenal
  const handleAddRow = () => {
    const newRow: BiweeklyPayrollRow = {
      employeeId: `emp-custom-${Date.now()}`,
      name: 'Nuevo Colaborador',
      role: 'Operativo',
      baseSalary: 0,
      overtimeHours: 0,
      overtimeAmount: 0,
      holidaysCount: 0,
      holidaysAmount: 0,
      bonuses: 0,
      loanDeduction: 0,
      restaurantServiceDeduction: 0,
      breakageDeduction: 0,
      breakageNotes: '',
      totalPaid: 0,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const empName = rows[index]?.name || 'este colaborador';
    if (window.confirm(`¿Seguro que deseas remover a "${empName}" de la nómina de esta quincena?`)) {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Agregar y eliminar en planilla especial INSS
  const handleAddSpecialRow = () => {
    const newRow: SpecialPayrollRow = {
      employeeId: `special-emp-${Date.now()}`,
      nss: '',
      name: 'Nuevo Asegurado',
      role: 'Operativo',
      hireDate: `${year}-${String(month).padStart(2, '0')}-01`,
      reportedSalary: 0,
      extraHolidayAmount: 0,
      aguinaldoProvision: 0,
      inssLaboral: 0,
      inssPatronal: 0,
      inatecPatronal: 0,
      totalCotizacion: 0,
      irLaboral: 0,
      totalCostBodegon: 0,
      netPayAsegurado: 0,
    };
    setSpecialRows((prev) => [...prev, newRow]);
  };

  const handleDeleteSpecialRow = (index: number) => {
    const empName = specialRows[index]?.name || 'este colaborador';
    if (window.confirm(`¿Seguro que deseas remover a "${empName}" de la planilla especial INSS?`)) {
      setSpecialRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Guardar quincena en el historial del estado global
  const handleSavePayroll = () => {
    const record: BiweeklyPayrollRecord = {
      id: currentPeriodId,
      year,
      month,
      period,
      status: 'DRAFT',
      rows,
      specialRows,
      authorizedBy: state.activeAdminName || 'Admon Bodegón',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpdateState((prev) => {
      const hist = (prev.payrollHistory || []).filter((h) => h.id !== currentPeriodId);
      return {
        ...prev,
        payrollHistory: [record, ...hist],
      };
    });

    setSaveNotice('¡Quincena guardada con éxito en el sistema!');
    setTimeout(() => setSaveNotice(null), 3500);
  };

  // Duplicar Quincena Anterior: Clona colaboradores y sueldos base reiniciando extras y deducciones temporales
  const handleDuplicatePreviousPayroll = () => {
    const previousRecord =
      (state.payrollHistory || []).find((h) => h.id !== currentPeriodId) ||
      state.payrollHistory?.[0];

    if (previousRecord && previousRecord.rows && previousRecord.rows.length > 0) {
      if (
        !window.confirm(
          `¿Deseas clonar los colaboradores y salarios de la quincena previa (${previousRecord.id})? Las horas extras, feriados y notas temporales se restablecerán a cero.`
        )
      ) {
        return;
      }

      const duplicatedRows: BiweeklyPayrollRow[] = previousRecord.rows.map((r) => ({
        ...r,
        overtimeHours: 0,
        overtimeAmount: 0,
        holidaysCount: 0,
        holidaysAmount: 0,
        bonuses: 0,
        loanDeduction: 0,
        restaurantServiceDeduction: 0,
        breakageDeduction: 0,
        breakageNotes: '',
        totalPaid: r.baseSalary || 0,
      }));

      const duplicatedSpecial: SpecialPayrollRow[] = (previousRecord.specialRows || []).map((sr) => {
        const sal = sr.reportedSalary || 0;
        const inssLab = parseFloat((sal * 0.07).toFixed(2));
        const inssPat = parseFloat((sal * 0.215).toFixed(2));
        const inatec = parseFloat((sal * 0.02).toFixed(2));
        const aguinaldo = parseFloat((sal / 12).toFixed(2));
        return {
          ...sr,
          extraHolidayAmount: 0,
          aguinaldoProvision: aguinaldo,
          inssLaboral: inssLab,
          inssPatronal: inssPat,
          inatecPatronal: inatec,
          totalCotizacion: parseFloat((inssLab + inssPat + inatec).toFixed(2)),
          totalCostBodegon: parseFloat((sal + aguinaldo + inssPat + inatec).toFixed(2)),
          netPayAsegurado: parseFloat((sal - inssLab - (sr.irLaboral || 0)).toFixed(2)),
        };
      });

      setRows(duplicatedRows);
      setSpecialRows(duplicatedSpecial);
      setSaveNotice('¡Nómina duplicada exitosamente de la quincena anterior!');
      setTimeout(() => setSaveNotice(null), 3500);
    } else {
      if (
        window.confirm(
          'No se encontró una nómina anterior en el historial. ¿Deseas inicializar la planilla con el personal activo registrado en el sistema?'
        )
      ) {
        const initialRows = (state.payrollEmployees || []).map((emp) => ({
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          baseSalary: emp.baseSalaryBiweekly || 0,
          overtimeHours: 0,
          overtimeAmount: 0,
          holidaysCount: 0,
          holidaysAmount: 0,
          bonuses: 0,
          loanDeduction: 0,
          restaurantServiceDeduction: 0,
          breakageDeduction: 0,
          breakageNotes: '',
          totalPaid: emp.baseSalaryBiweekly || 0,
        }));
        setRows(initialRows);
        setSaveNotice('¡Planilla inicializada con el personal activo!');
        setTimeout(() => setSaveNotice(null), 3500);
      }
    }
  };

  // Sincronizar automáticamente con Bodegón Pass
  const handleSyncBodegonPass = async () => {
    setSyncing(true);
    const targetUrl = state.bodegonPassUrl || DEFAULT_BODEGON_PASS_URL;
    setSyncNotice(`Conectando con Bodegón Pass en ${targetUrl}...`);

    try {
      const result = await syncFromBodegonPass(targetUrl, startDate, endDate);

      if (result.success) {
        // Inyectar horas extras y feriados en las filas correspondientes
        const updatedRows = rows.map((row) => {
          let otHours = row.overtimeHours;
          let otAmount = row.overtimeAmount;
          let holCount = row.holidaysCount;

          for (const [passName, ot] of Object.entries(result.overtimeByEmployee)) {
            if (matchEmployeeName(row.name, passName)) {
              otHours = ot.hours;
              otAmount = ot.amount > 0 ? ot.amount : parseFloat(((row.baseSalary / 15 / 8 * 2) * ot.hours).toFixed(2));
            }
          }

          for (const [passName, hol] of Object.entries(result.holidaysByEmployee)) {
            if (matchEmployeeName(row.name, passName)) {
              holCount = hol.count;
            }
          }

          const holAmount = parseFloat(((row.baseSalary * 2 / 30) * holCount).toFixed(2));
          const earnings = row.baseSalary + otAmount + holAmount + row.bonuses;
          const deductions = row.loanDeduction + row.restaurantServiceDeduction + row.breakageDeduction;

          return {
            ...row,
            overtimeHours: otHours,
            overtimeAmount: otAmount,
            holidaysCount: holCount,
            holidaysAmount: holAmount,
            totalPaid: parseFloat((earnings - deductions).toFixed(2)),
          };
        });

        setRows(updatedRows);

        // Actualizar planilla especial INSS en caso de horas extras o feriados para asegurados
        setSpecialRows((prevSpecial) =>
          prevSpecial.map((sr) => {
            const matchRow = updatedRows.find((r) => matchEmployeeName(r.name, sr.name));
            if (!matchRow) return sr;

            const extraAmt = (matchRow.overtimeAmount || 0) + (matchRow.holidaysAmount || 0);
            const sal = sr.reportedSalary;
            const inssLab = parseFloat(((sal + extraAmt) * 0.07).toFixed(2));
            const inssPat = parseFloat(((sal + extraAmt) * 0.215).toFixed(2));
            const inatec = parseFloat(((sal + extraAmt) * 0.02).toFixed(2));
            const cotiz = parseFloat((inssLab + inssPat + inatec).toFixed(2));
            const aguinaldo = parseFloat(((sal + extraAmt) / 12).toFixed(2));
            const cost = parseFloat(((sal + extraAmt) + aguinaldo + inssPat + inatec).toFixed(2));
            const net = parseFloat(((sal + extraAmt) - inssLab).toFixed(2));

            return {
              ...sr,
              extraHolidayAmount: extraAmt,
              aguinaldoProvision: aguinaldo,
              inssLaboral: inssLab,
              inssPatronal: inssPat,
              inatecPatronal: inatec,
              totalCotizacion: cotiz,
              totalCostBodegon: cost,
              netPayAsegurado: net,
            };
          })
        );

        setSyncNotice(`✅ ${result.message}`);
      } else {
        setSyncNotice(`ℹ️ ${result.message}`);
      }
    } catch (err: any) {
      setSyncNotice(`⚠️ Error en la sincronización: ${err?.message || 'Error de red'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 7000);
    }
  };

  // Manejadores de Impresión
  const handlePrintGeneral = () => {
    setPrintMenuOpen(false);
    printBiweeklyPayrollGeneral(period, month, year, rows, state.activeAdminName || 'Admon Bodegón');
  };

  const handlePrintReceipts = () => {
    setPrintMenuOpen(false);
    printIndividualReceipts(period, month, year, rows, state.activeAdminName || 'Admon Bodegón');
  };

  const handlePrintSpecialINSS = () => {
    setPrintMenuOpen(false);
    printSpecialPayrollINSS(period, month, year, specialRows);
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    exportPayrollToExcel(period, month, year, rows, specialRows, state.activeAdminName || 'Admon Bodegón');
  };

  // Manejo de Incidencias de la bitácora
  const handleAddIncident = (newInc: Omit<PayrollIncident, 'id' | 'createdAt'>) => {
    const inc: PayrollIncident = {
      ...newInc,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    onUpdateState((prev) => ({
      ...prev,
      payrollIncidents: [inc, ...(prev.payrollIncidents || [])],
    }));
  };

  const handleDeleteIncident = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      payrollIncidents: (prev.payrollIncidents || []).filter((i) => i.id !== id),
    }));
  };

  // Guardar lista de empleados modificada
  const handleSaveEmployees = (newEmployees: PayrollEmployee[]) => {
    onUpdateState((prev) => ({
      ...prev,
      payrollEmployees: newEmployees,
    }));
  };

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-3 max-w-[1440px] mx-auto pb-12 select-none">
      {/* Barra Superior de Control y Navegación: Diseño Rectangular Corporativo */}
      <div className="p-3 border border-slate-300 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Pestañas Submenú Rectangulares */}
        <div className="flex items-center border border-slate-300 bg-slate-100 p-0.5">
          <button
            onClick={() => setActiveSubTab('quincenal')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'quincenal'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#1c6856]" />
            <span>Planilla Quincenal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('especial')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'especial'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-700" />
            <span>Planilla Especial (INSS)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('incidencias')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'incidencias'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700" />
            <span>Incidencias & Vajilla</span>
            {(state.payrollIncidents || []).length > 0 && (
              <span className="px-1.5 py-0.2 border border-amber-300 bg-amber-100 text-amber-900 text-[9px] font-black">
                {state.payrollIncidents.length}
              </span>
            )}
          </button>
        </div>

        {/* Selector de Período Quincenal */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Mes */}
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="text-xs font-bold border border-slate-300 px-2 py-1.5 bg-white text-slate-800 outline-none cursor-pointer"
          >
            {monthsList.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Quincena */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PayrollPeriod)}
            className="text-xs font-bold border border-slate-300 px-2 py-1.5 bg-white text-slate-800 outline-none cursor-pointer"
          >
            <option value="FIRST_HALF">1ra Quincena (01 al 15)</option>
            <option value="SECOND_HALF">2da Quincena (16 al Fin)</option>
          </select>

          {/* Año */}
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="text-xs font-bold border border-slate-300 px-2 py-1.5 bg-white text-slate-800 outline-none cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>

        {/* Botones de Acción: Rectangulares Formales */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Duplicar Quincena Anterior */}
          <button
            onClick={handleDuplicatePreviousPayroll}
            className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Copiar colaboradores y salarios del período anterior (reinicia extras y notas a cero)"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            <span>Duplicar Quincena</span>
          </button>

          {/* Sincronizar Bodegón Pass */}
          <div className="flex items-center">
            <button
              onClick={handleSyncBodegonPass}
              disabled={syncing}
              className="px-2.5 py-1.5 bg-emerald-50 text-[#1c6856] hover:bg-emerald-100 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              title="Conectar con Bodegón Pass para importar horas extras y feriados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Bodegón Pass'}</span>
            </button>
            <button
              onClick={() => {
                setTestResult(null);
                setPassConfigOpen(true);
              }}
              className="px-1.5 py-1.5 bg-emerald-50 text-[#1c6856] hover:bg-emerald-100 border-y border-r border-emerald-300 text-xs font-bold transition flex items-center cursor-pointer"
              title="Configurar servidor de Bodegón Pass"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Guardar Quincena */}
          <button
            onClick={handleSavePayroll}
            className="px-3 py-1.5 border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Guardar cambios de esta quincena en el sistema"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>

          {/* Menú de Impresión Hoja Carta */}
          <div className="relative">
            <button
              onClick={() => setPrintMenuOpen((prev) => !prev)}
              className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir Carta</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {printMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-300 shadow-lg z-50 py-1 divide-y divide-slate-100">
                <button
                  onClick={handlePrintGeneral}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer block"
                >
                  <div className="font-bold text-slate-900">Sábana General Quincenal</div>
                  <div className="text-[10px] text-slate-500">Hoja Carta horizontal con firmas oficiales</div>
                </button>

                <button
                  onClick={handlePrintReceipts}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer block"
                >
                  <div className="font-bold text-slate-900">Recibos de Pago (2 por Hoja)</div>
                  <div className="text-[10px] text-slate-500">Hoja Carta vertical cortable</div>
                </button>

                <button
                  onClick={handlePrintSpecialINSS}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer block"
                >
                  <div className="font-bold text-slate-900">Planilla Especial INSS</div>
                  <div className="text-[10px] text-slate-500">Registro Patronal No 1550850</div>
                </button>
              </div>
            )}
          </div>

          {/* Exportar a Excel */}
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 border border-emerald-800 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Exportar archivo .xlsx con fórmulas"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* Gestionar Personal */}
          <button
            onClick={() => setEmployeesModalOpen(true)}
            className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Modificar catálogo de colaboradores, cargos y salarios"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span>Personal</span>
          </button>
        </div>
      </div>

      {/* Avisos de Notificación Rectangulares */}
      {syncNotice && (
        <div className="p-2.5 border border-blue-400 bg-blue-50 text-blue-950 text-xs font-semibold flex items-center justify-between">
          <span>{syncNotice}</span>
          <button onClick={() => setSyncNotice(null)} className="text-blue-700 hover:text-blue-900 font-bold ml-2">×</button>
        </div>
      )}

      {saveNotice && (
        <div className="p-2.5 border border-emerald-400 bg-emerald-50 text-emerald-950 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>{saveNotice}</span>
          </div>
          <button onClick={() => setSaveNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Vistas según la pestaña activa */}
      {activeSubTab === 'quincenal' && (
        <BiweeklyPayrollTable
          rows={rows}
          onRowChange={handleRowChange}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onPrintRowReceipt={(row) =>
            printThermalIndividualPayrollReceipt(
              row,
              period === 'FIRST_HALF' ? '1ra Quincena (01 al 15)' : '2da Quincena (16 al Fin)',
              monthsList[month - 1],
              year,
              state.activeAdminName || 'Admon Bodegón'
            )
          }
          authorizedBy={state.activeAdminName || 'Admon Bodegón'}
        />
      )}

      {activeSubTab === 'especial' && (
        <SpecialPayrollTable
          rows={specialRows}
          onRowChange={handleSpecialRowChange}
          onAddRow={handleAddSpecialRow}
          onDeleteRow={handleDeleteSpecialRow}
        />
      )}

      {activeSubTab === 'incidencias' && (
        <PayrollIncidentsView
          employees={state.payrollEmployees || []}
          incidents={state.payrollIncidents || []}
          onAddIncident={handleAddIncident}
          onDeleteIncident={handleDeleteIncident}
        />
      )}

      {/* Modal de Personal & Salarios */}
      <PayrollEmployeesModal
        isOpen={employeesModalOpen}
        onClose={() => setEmployeesModalOpen(false)}
        employees={state.payrollEmployees || []}
        onSaveEmployees={handleSaveEmployees}
      />

      {/* Modal de Configuración del Servidor Bodegón Pass */}
      {passConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#1c6856]" />
                <h3 className="font-bold text-slate-900 text-sm">Servidor de Bodegón Pass</h3>
              </div>
              <button
                onClick={() => setPassConfigOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL del Servidor API (Kiosco / Asistencia)
                </label>
                <input
                  type="text"
                  value={passUrlInput}
                  onChange={(e) => setPassUrlInput(e.target.value)}
                  placeholder="https://asistenciabodegon-api.onrender.com"
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:border-[#1c6856] outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  URL oficial en la nube: <code className="text-[#1c6856] font-semibold">{DEFAULT_BODEGON_PASS_URL}</code>
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    testResult.ok
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  {testResult.ok ? '✅ ' : '❌ '}
                  {testResult.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    setTestingPass(true);
                    setTestResult(null);
                    const res = await testBodegonPassConnection(passUrlInput);
                    setTestResult(res);
                    setTestingPass(false);
                  }}
                  disabled={testingPass}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${testingPass ? 'animate-spin' : ''}`} />
                  <span>{testingPass ? 'Probando...' : 'Probar Conexión'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPassUrlInput(DEFAULT_BODEGON_PASS_URL);
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = passUrlInput.trim().replace(/\/+$/, '') || DEFAULT_BODEGON_PASS_URL;
                      onUpdateState((prev) => ({
                        ...prev,
                        bodegonPassUrl: clean,
                      }));
                      setPassConfigOpen(false);
                      setSyncNotice(`URL de Bodegón Pass guardada: ${clean}`);
                      setTimeout(() => setSyncNotice(null), 4000);
                    }}
                    className="px-4 py-1.5 text-xs font-bold bg-[#1c6856] hover:bg-[#155243] text-white rounded-lg transition cursor-pointer shadow-xs"
                  >
                    Guardar URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
