import React, { useState, useEffect } from 'react';
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
import { syncCatalogsToCloud } from '../../services/supabaseSync';
import { getDeletedPayrollNames, addDeletedPayrollName, removeDeletedPayrollName } from '../../services/storage';
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
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}

export const PayrollView: React.FC<Props> = ({
  state,
  onUpdateState,
  subTab: externalSubTab,
  onSubTabChange: externalOnSubTabChange,
  onUnsavedChangesChange,
}) => {
  // Estado de cambios pendientes de confirmar en la nube
  const [hasUnconfirmedChanges, setHasUnconfirmedChanges] = useState(false);

  const updateUnconfirmedFlag = (dirty: boolean) => {
    setHasUnconfirmedChanges(dirty);
    onUnsavedChangesChange?.(dirty);
  };

  // Pestaña activa (si no viene por prop, usar estado interno)
  const [internalSubTab, setInternalSubTab] = useState<'quincenal' | 'especial' | 'incidencias'>('quincenal');
  const activeSubTab = externalSubTab || internalSubTab;
  const setActiveSubTab = (tab: 'quincenal' | 'especial' | 'incidencias') => {
    if (tab === activeSubTab) return;
    if (hasUnconfirmedChanges) {
      const proceed = window.confirm(
        '⚠️ Tienes cambios en la planilla que aún no has confirmado en la nube.\n\n¿Deseas cambiar de pestaña de todos modos?\n(Tus cambios se conservan en borrador local, pero recuerda presionar "Confirmar Cambios" para subirlos a la nube).'
      );
      if (!proceed) return;
    }
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

  // Función auxiliar para calcular el rango oficial por defecto (1ra: 01 al 14 | 2da: 15 al Fin)
  const computeDefaultRange = (y: number, m: number, p: PayrollPeriod) => {
    const yStr = String(y);
    const mStr = String(m).padStart(2, '0');
    if (p === 'FIRST_HALF') {
      return {
        start: `${yStr}-${mStr}-01`,
        end: `${yStr}-${mStr}-14`,
      };
    } else {
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${yStr}-${mStr}-15`,
        end: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }
  };

  // Rango de fechas del período (YYYY-MM-DD) editable por el usuario
  const [startDate, setStartDate] = useState<string>(() => computeDefaultRange(year, month, period).start);
  const [endDate, setEndDate] = useState<string>(() => computeDefaultRange(year, month, period).end);

  useEffect(() => {
    const def = computeDefaultRange(year, month, period);
    setStartDate(def.start);
    setEndDate(def.end);
  }, [year, month, period]);

  // Construir filas operativas y especiales a partir del historial o de los empleados actuales
  const [rows, setRows] = useState<BiweeklyPayrollRow[]>([]);
  const [specialRows, setSpecialRows] = useState<SpecialPayrollRow[]>([]);
  const loadedPeriodRef = React.useRef<string>('');

  // Auto-guardar borrador en el estado local de la app en cada edición para evitar pérdida al desmontar pestañas
  const persistDraftLocally = (nextRows: BiweeklyPayrollRow[], nextSpecialRows: SpecialPayrollRow[]) => {
    updateUnconfirmedFlag(true);
    onUpdateState((prev) => {
      const record: BiweeklyPayrollRecord = {
        id: currentPeriodId,
        year,
        month,
        period,
        status: 'DRAFT',
        rows: nextRows,
        specialRows: nextSpecialRows,
        authorizedBy: prev.activeAdminName || 'Admon Bodegón',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextHist = [record, ...(prev.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];
      return {
        ...prev,
        payrollHistory: nextHist,
      };
    });
  };

  // Inicializar o recargar filas cuando cambia el período (sin sobrescribir ediciones en curso)
  useEffect(() => {
    if (hasUnconfirmedChanges && loadedPeriodRef.current === currentPeriodId) {
      return;
    }
    loadedPeriodRef.current = currentPeriodId;

    const existing = (state.payrollHistory || []).find((h) => h.id === currentPeriodId);

    const deletedSet = new Set(getDeletedPayrollNames());
    const isExcluded = (n: string) => {
      const s = (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (deletedSet.has(s)) return true;
      return (
        s.includes('maverick') ||
        s.includes('sandor') ||
        s.includes('eliezer') ||
        s.includes('david quintero') ||
        s.includes('heiling') ||
        s.includes('lea calvo') ||
        s.includes('melvin ojeda') ||
        s.includes('zenon lopez') ||
        s.includes('carlos eduardo garcia')
      );
    };

    if (existing && existing.rows && existing.rows.length > 0) {
      setRows(existing.rows.filter((row) => !isExcluded(row.name)));
      setSpecialRows((existing.specialRows || []).filter((s) => !isExcluded(s.name)));
    } else {
      // Generar filas nuevas calculando incidencias de la bitácora en ese rango
      // Deduplicar empleados activos garantizando exactamente 1 por persona
      const rawActiveEmps = (state.payrollEmployees || []).filter((e) => e.isActive && !isExcluded(e.name));
      const activeEmps: PayrollEmployee[] = [];
      for (const e of rawActiveEmps) {
        if (!activeEmps.some((a) => matchEmployeeName(a.name, e.name))) {
          activeEmps.push(e);
        }
      }

      const newRows: BiweeklyPayrollRow[] = activeEmps.map((emp) => {
        // Filtrar incidencias de este empleado en la quincena seleccionada
        const empIncidents = (state.payrollIncidents || []).filter(
          (inc) =>
            (inc.employeeId === emp.id || matchEmployeeName(inc.employeeName, emp.name)) &&
            inc.date >= startDate &&
            inc.date <= endDate
        );

        const loanDeduction = empIncidents
          .filter((i) => i.type === 'PRESTAMO_ADELANTO')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const restDeduction = empIncidents
          .filter((i) => i.type === 'SERVICIO_RESTAURANTE')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const breakageIncidents = empIncidents.filter((i) => i.type === 'VAJILLA_PERDIDA' || i.type === 'OTRO');
        const breakageDeduction = breakageIncidents.reduce((sum, i) => sum + (i.amount || 0), 0);

        const notes = breakageIncidents.map((i) => `${i.concept}: C$${i.amount}`).join(', ');

        const base = emp.baseSalaryBiweekly || 0;
        const totalEarnings = base;
        const totalDeductions = loanDeduction + restDeduction + breakageDeduction;

        return {
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          baseSalary: base,
          overtimeHours: 0,
          overtimeAmount: 0,
          holidaysCount: 0,
          holidaysAmount: 0,
          inssDeduction: 0,
          bonuses: 0,
          loanDeduction: loanDeduction,
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
    const next = [...rows];
    next[index] = updatedRow;
    setRows(next);
    persistDraftLocally(next, specialRows);
  };

  // Manejar cambio en una fila de la planilla especial INSS
  const handleSpecialRowChange = (index: number, updatedRow: SpecialPayrollRow) => {
    const next = [...specialRows];
    next[index] = updatedRow;
    setSpecialRows(next);
    persistDraftLocally(rows, next);
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
      inssDeduction: 0,
      bonuses: 0,
      loanDeduction: 0,
      restaurantServiceDeduction: 0,
      breakageDeduction: 0,
      breakageNotes: '',
      totalPaid: 0,
    };
    const next = [...rows, newRow];
    setRows(next);
    persistDraftLocally(next, specialRows);
  };

  const handleDeleteRow = (index: number) => {
    const targetRow = rows[index];
    const empName = targetRow?.name || 'este colaborador';
    if (window.confirm(`¿Seguro que deseas eliminar a "${empName}" de la planilla y del padrón de personal?`)) {
      if (targetRow?.name) {
        addDeletedPayrollName(targetRow.name);
      }
      const nextRows = rows.filter((_, i) => i !== index);
      const nextSpecial = specialRows.filter(
        (sr) => sr.employeeId !== targetRow.employeeId && !matchEmployeeName(sr.name, targetRow.name)
      );
      setRows(nextRows);
      setSpecialRows(nextSpecial);

      const nextEmps = (state.payrollEmployees || []).filter(
        (e) => e.id !== targetRow.employeeId && !matchEmployeeName(e.name, targetRow.name)
      );
      const record: BiweeklyPayrollRecord = {
        id: currentPeriodId,
        year,
        month,
        period,
        status: 'DRAFT',
        rows: nextRows,
        specialRows: nextSpecial,
        authorizedBy: state.activeAdminName || 'Admon Bodegón',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextHist = [record, ...(state.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];

      onUpdateState((prev) => ({
        ...prev,
        payrollEmployees: (prev.payrollEmployees || []).filter(
          (e) => e.id !== targetRow.employeeId && !matchEmployeeName(e.name, targetRow.name)
        ),
        payrollHistory: [record, ...(prev.payrollHistory || []).filter((h) => h.id !== currentPeriodId)],
      }));

      syncCatalogsToCloud(state.vendorsList, state.expenseCategories, nextEmps, nextHist).catch(console.warn);
      setSaveNotice(`Colaborador "${empName}" eliminado permanentemente y sincronizado en la nube.`);
      setTimeout(() => setSaveNotice(null), 3500);
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
    const next = [...specialRows, newRow];
    setSpecialRows(next);
    persistDraftLocally(rows, next);
  };

  const handleDeleteSpecialRow = (index: number) => {
    const targetSr = specialRows[index];
    const empName = targetSr?.name || 'este colaborador';
    if (window.confirm(`¿Seguro que deseas remover a "${empName}" de la planilla especial INSS?`)) {
      const nextSpecial = specialRows.filter((_, i) => i !== index);
      setSpecialRows(nextSpecial);

      onUpdateState((prev) => {
        const nextEmps = (prev.payrollEmployees || []).map((e) =>
          e.id === targetSr.employeeId || matchEmployeeName(e.name, targetSr.name)
            ? { ...e, isInsuredINSS: false }
            : e
        );
        const record: BiweeklyPayrollRecord = {
          id: currentPeriodId,
          year,
          month,
          period,
          status: 'DRAFT',
          rows,
          specialRows: nextSpecial,
          authorizedBy: prev.activeAdminName || 'Admon Bodegón',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const nextHist = [record, ...(prev.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];
        syncCatalogsToCloud(prev.vendorsList, prev.expenseCategories, nextEmps, nextHist).catch(console.warn);
        return {
          ...prev,
          payrollEmployees: nextEmps,
          payrollHistory: nextHist,
        };
      });
    }
  };

  // Confirmar y Guardar quincena y catálogo de personal en estado local y Supabase Cloud
  const handleSavePayroll = async () => {
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

    // Sincronizar también el padrón de empleados con las filas actuales (nombres, cargos, salarios base, INSS)
    const updatedEmployees: PayrollEmployee[] = rows.map((r) => {
      removeDeletedPayrollName(r.name);
      const existingEmp = (state.payrollEmployees || []).find(
        (e) => e.id === r.employeeId || matchEmployeeName(e.name, r.name)
      );
      const matchingSpecial = specialRows.find(
        (sr) => sr.employeeId === r.employeeId || matchEmployeeName(sr.name, r.name)
      );
      return {
        id: existingEmp?.id || r.employeeId || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: r.name,
        role: r.role,
        baseSalaryBiweekly: r.baseSalary,
        isInsuredINSS: !!matchingSpecial || (existingEmp?.isInsuredINSS ?? false),
        nss: matchingSpecial?.nss || existingEmp?.nss,
        hireDate: matchingSpecial?.hireDate || existingEmp?.hireDate,
        reportedSalaryINSS: matchingSpecial?.reportedSalary || existingEmp?.reportedSalaryINSS,
        isActive: true,
      };
    });

    // Cualquier empleado previo que no esté en las filas actuales queda marcado como eliminado
    (state.payrollEmployees || []).forEach((oldEmp) => {
      const stillPresent = updatedEmployees.some(
        (u) => u.id === oldEmp.id || matchEmployeeName(u.name, oldEmp.name)
      );
      if (!stillPresent) {
        addDeletedPayrollName(oldEmp.name);
      }
    });

    const nextHist = [record, ...(state.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];

    onUpdateState((prev) => ({
      ...prev,
      payrollEmployees: updatedEmployees,
      payrollHistory: nextHist,
    }));

    updateUnconfirmedFlag(false);
    setSaveNotice('Confirmando y sincronizando cambios en Supabase Cloud...');
    const ok = await syncCatalogsToCloud(state.vendorsList, state.expenseCategories, updatedEmployees, nextHist);
    if (ok) {
      setSaveNotice('¡Cambios de planilla y personal confirmados y guardados en la nube con éxito!');
    } else {
      setSaveNotice('¡Cambios guardados localmente! (Se sincronizarán al conectar a la red)');
    }
    setTimeout(() => setSaveNotice(null), 4000);
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
        inssDeduction: 0,
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
      persistDraftLocally(duplicatedRows, duplicatedSpecial);
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
          inssDeduction: 0,
          bonuses: 0,
          loanDeduction: 0,
          restaurantServiceDeduction: 0,
          breakageDeduction: 0,
          breakageNotes: '',
          totalPaid: emp.baseSalaryBiweekly || 0,
        }));
        setRows(initialRows);
        persistDraftLocally(initialRows, specialRows);
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
          const inss = Math.abs(row.inssDeduction !== undefined ? (row.inssDeduction || 0) : (row.bonuses || 0));
          const earnings = row.baseSalary + otAmount + holAmount;
          const deductions = inss + (row.loanDeduction || 0) + (row.restaurantServiceDeduction || 0) + (row.breakageDeduction || 0);

          return {
            ...row,
            overtimeHours: otHours,
            overtimeAmount: otAmount,
            holidaysCount: holCount,
            holidaysAmount: holAmount,
            inssDeduction: inss,
            totalPaid: parseFloat((earnings - deductions).toFixed(2)),
          };
        });

        setRows(updatedRows);

        // Actualizar planilla especial INSS en caso de horas extras o feriados para asegurados
        const updatedSpecialRows = specialRows.map((sr) => {
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
        });

        setSpecialRows(updatedSpecialRows);
        persistDraftLocally(updatedRows, updatedSpecialRows);

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

  // Recalcular deducciones de las filas operativas según las incidencias registradas en el corte activo
  const syncIncidentsIntoRowsAndCloud = (nextIncidents: PayrollIncident[], affectedEmpIds: string[], affectedEmpNames: string[]) => {
    const nextRows = rows.map((row) => {
      const isAffected =
        affectedEmpIds.includes(row.employeeId) ||
        affectedEmpNames.some((n) => matchEmployeeName(row.name, n));

      if (!isAffected) return row;

      const empIncidents = nextIncidents.filter(
        (inc) =>
          (inc.employeeId === row.employeeId || matchEmployeeName(inc.employeeName, row.name)) &&
          inc.date >= startDate &&
          inc.date <= endDate
      );

      const loanIncs = empIncidents.filter((i) => i.type === 'PRESTAMO_ADELANTO');
      const restIncs = empIncidents.filter((i) => i.type === 'SERVICIO_RESTAURANTE');
      const brkIncs = empIncidents.filter((i) => i.type === 'VAJILLA_PERDIDA' || i.type === 'OTRO');

      const nextLoan = parseFloat(loanIncs.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2));
      const nextRest = parseFloat(restIncs.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2));
      const nextBrk = parseFloat(brkIncs.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2));
      const nextNotes = brkIncs.map((i) => `${i.concept}: C$${i.amount}`).join(', ');

      const inss = Math.abs(row.inssDeduction !== undefined ? (row.inssDeduction || 0) : (row.bonuses || 0));
      const earnings =
        (row.baseSalary || 0) +
        (row.overtimeAmount || 0) +
        (row.holidaysAmount || 0);
      const deductions = inss + nextLoan + nextRest + nextBrk;

      return {
        ...row,
        loanDeduction: nextLoan,
        restaurantServiceDeduction: nextRest,
        breakageDeduction: nextBrk,
        breakageNotes: nextNotes,
        inssDeduction: inss,
        totalPaid: parseFloat((earnings - deductions).toFixed(2)),
      };
    });

    setRows(nextRows);

    const record: BiweeklyPayrollRecord = {
      id: currentPeriodId,
      year,
      month,
      period,
      status: 'DRAFT',
      rows: nextRows,
      specialRows,
      authorizedBy: state.activeAdminName || 'Admon Bodegón',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextHist = [record, ...(state.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];

    onUpdateState((prev) => ({
      ...prev,
      payrollIncidents: nextIncidents,
      payrollHistory: nextHist,
    }));

    syncCatalogsToCloud(
      state.vendorsList,
      state.expenseCategories,
      state.payrollEmployees,
      nextHist,
      nextIncidents,
      state.tablewareItems,
      state.tablewareLosses
    ).catch(console.warn);
  };

  // Manejo de Incidencias de la bitácora (sincroniza en vivo con Sábana Quincenal y Supabase Cloud)
  const handleAddIncident = (newInc: Omit<PayrollIncident, 'id' | 'createdAt'>) => {
    const inc: PayrollIncident = {
      ...newInc,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const nextIncidents = [inc, ...(state.payrollIncidents || [])];
    syncIncidentsIntoRowsAndCloud(nextIncidents, [inc.employeeId], [inc.employeeName]);
    setSaveNotice(`Incidencia "${inc.concept}" (C$ ${inc.amount.toFixed(2)}) aplicada a ${inc.employeeName} en la planilla y guardada en la nube.`);
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleUpdateIncident = (updatedInc: PayrollIncident) => {
    const oldInc = (state.payrollIncidents || []).find((i) => i.id === updatedInc.id);
    const nextIncidents = (state.payrollIncidents || []).map((i) => (i.id === updatedInc.id ? updatedInc : i));
    const empIds = [updatedInc.employeeId, ...(oldInc ? [oldInc.employeeId] : [])];
    const empNames = [updatedInc.employeeName, ...(oldInc ? [oldInc.employeeName] : [])];
    syncIncidentsIntoRowsAndCloud(nextIncidents, empIds, empNames);
    setSaveNotice(`Incidencia actualizada y recalculada en la planilla.`);
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleDeleteIncident = (id: string) => {
    const target = (state.payrollIncidents || []).find((i) => i.id === id);
    const nextIncidents = (state.payrollIncidents || []).filter((i) => i.id !== id);
    syncIncidentsIntoRowsAndCloud(
      nextIncidents,
      target ? [target.employeeId] : [],
      target ? [target.employeeName] : []
    );
    setSaveNotice(`Incidencia eliminada y descontada de la planilla.`);
    setTimeout(() => setSaveNotice(null), 3500);
  };

  // Guardar lista de empleados modificada desde el modal y sincronizar con la sábana actual y Supabase Cloud
  const handleSaveEmployees = async (newEmployees: PayrollEmployee[]) => {
    const activeEmps = newEmployees.filter((e) => e.isActive !== false);

    // Registrar en lista de excluidos cualquier empleado eliminado o inactivado
    activeEmps.forEach((emp) => removeDeletedPayrollName(emp.name));
    newEmployees.filter((e) => e.isActive === false).forEach((emp) => addDeletedPayrollName(emp.name));
    (state.payrollEmployees || []).forEach((oldEmp) => {
      const stillActive = activeEmps.some(
        (a) => a.id === oldEmp.id || matchEmployeeName(a.name, oldEmp.name)
      );
      if (!stillActive) {
        addDeletedPayrollName(oldEmp.name);
      }
    });

    // Sincronizar las filas de la quincena actual con el nuevo padrón de empleados
    const nextRows: BiweeklyPayrollRow[] = activeEmps.map((emp) => {
      const existingRow = rows.find((r) => r.employeeId === emp.id || matchEmployeeName(r.name, emp.name));
      if (existingRow) {
        const base = emp.baseSalaryBiweekly || 0;
        const holAmt = parseFloat(((base * 2 / 30) * (existingRow.holidaysCount || 0)).toFixed(2));
        const inss = Math.abs(existingRow.inssDeduction !== undefined ? (existingRow.inssDeduction || 0) : (existingRow.bonuses || 0));
        const earnings = base + (existingRow.overtimeAmount || 0) + holAmt;
        const deductions =
          inss +
          (existingRow.loanDeduction || 0) +
          (existingRow.restaurantServiceDeduction || 0) +
          (existingRow.breakageDeduction || 0);
        return {
          ...existingRow,
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          baseSalary: base,
          holidaysAmount: holAmt,
          inssDeduction: inss,
          totalPaid: parseFloat((earnings - deductions).toFixed(2)),
        };
      }
      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        baseSalary: emp.baseSalaryBiweekly || 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        holidaysCount: 0,
        holidaysAmount: 0,
        inssDeduction: 0,
        bonuses: 0,
        loanDeduction: 0,
        restaurantServiceDeduction: 0,
        breakageDeduction: 0,
        breakageNotes: '',
        totalPaid: emp.baseSalaryBiweekly || 0,
      };
    });

    const insuredEmps = activeEmps.filter((e) => e.isInsuredINSS);
    const nextSpecialRows: SpecialPayrollRow[] = insuredEmps.map((emp) => {
      const existingSr = specialRows.find((sr) => sr.employeeId === emp.id || matchEmployeeName(sr.name, emp.name));
      const sal = emp.reportedSalaryINSS || emp.baseSalaryBiweekly || existingSr?.reportedSalary || 5675.04;
      const aguinaldo = parseFloat((sal / 12).toFixed(2));
      const inssLab = parseFloat((sal * 0.07).toFixed(2));
      const inssPat = parseFloat((sal * 0.215).toFixed(2));
      const inatec = parseFloat((sal * 0.02).toFixed(2));
      const cotiz = parseFloat((inssLab + inssPat + inatec).toFixed(2));
      const cost = parseFloat((sal + aguinaldo + inssPat + inatec).toFixed(2));
      const ir = existingSr?.irLaboral || 0;
      const extra = existingSr?.extraHolidayAmount || 0;
      const net = parseFloat((sal - inssLab - ir + extra).toFixed(2));

      return {
        employeeId: emp.id,
        nss: emp.nss || existingSr?.nss || '',
        name: emp.name,
        role: emp.role,
        hireDate: emp.hireDate || existingSr?.hireDate || '2025-11-01',
        reportedSalary: sal,
        extraHolidayAmount: extra,
        aguinaldoProvision: aguinaldo,
        inssLaboral: inssLab,
        inssPatronal: inssPat,
        inatecPatronal: inatec,
        totalCotizacion: cotiz,
        irLaboral: ir,
        totalCostBodegon: cost,
        netPayAsegurado: net,
      };
    });

    setRows(nextRows);
    setSpecialRows(nextSpecialRows);

    const record: BiweeklyPayrollRecord = {
      id: currentPeriodId,
      year,
      month,
      period,
      status: 'DRAFT',
      rows: nextRows,
      specialRows: nextSpecialRows,
      authorizedBy: state.activeAdminName || 'Admon Bodegón',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextHist = [record, ...(state.payrollHistory || []).filter((h) => h.id !== currentPeriodId)];

    onUpdateState((prev) => ({
      ...prev,
      payrollEmployees: newEmployees,
      payrollHistory: nextHist,
    }));

    updateUnconfirmedFlag(false);
    setSaveNotice('Sincronizando padrón de colaboradores en Supabase Cloud...');
    const ok = await syncCatalogsToCloud(state.vendorsList, state.expenseCategories, newEmployees, nextHist);
    if (ok) {
      setSaveNotice('¡Padrón de colaboradores y planilla actualizados y guardados en la nube!');
    } else {
      setSaveNotice('¡Padrón de colaboradores actualizado localmente!');
    }
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const confirmPeriodChange = (): boolean => {
    if (!hasUnconfirmedChanges) return true;
    const proceed = window.confirm(
      '⚠️ Tienes cambios en la planilla de este período que aún no has confirmado en la nube.\n\n¿Seguro que deseas cambiar de período sin presionar "Confirmar Cambios"?'
    );
    if (proceed) {
      updateUnconfirmedFlag(false);
    }
    return proceed;
  };

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
            onChange={(e) => {
              const nextM = parseInt(e.target.value, 10);
              if (confirmPeriodChange()) setMonth(nextM);
            }}
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
            onChange={(e) => {
              const nextP = e.target.value as PayrollPeriod;
              if (confirmPeriodChange()) setPeriod(nextP);
            }}
            className="text-xs font-bold border border-slate-300 px-2 py-1.5 bg-white text-slate-800 outline-none cursor-pointer"
          >
            <option value="FIRST_HALF">1ra Quincena (01 al 14)</option>
            <option value="SECOND_HALF">2da Quincena (15 al Fin)</option>
          </select>

          {/* Año */}
          <select
            value={year}
            onChange={(e) => {
              const nextY = parseInt(e.target.value, 10);
              if (confirmPeriodChange()) setYear(nextY);
            }}
            className="text-xs font-bold border border-slate-300 px-2 py-1.5 bg-white text-slate-800 outline-none cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          {/* Rango de Corte (Bodegón Pass & Incidencias) */}
          <div
            className="flex items-center gap-1 border border-emerald-300 bg-emerald-50/70 px-2 py-1"
            title="Rango exacto de fechas que se consulta en Bodegón Pass (horas extras y feriados) y en Incidencias"
          >
            <span className="text-[10px] font-black uppercase text-[#1c6856] tracking-wider">Corte:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[11px] font-mono font-bold text-slate-800 bg-white border border-slate-300 px-1.5 py-0.5 outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-500">al</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[11px] font-mono font-bold text-slate-800 bg-white border border-slate-300 px-1.5 py-0.5 outline-none cursor-pointer"
            />
          </div>
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
              title={`Conectar con Bodegón Pass para importar horas extras y feriados del corte (${startDate} al ${endDate})`}
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

          {/* Confirmar Cambios */}
          <button
            onClick={handleSavePayroll}
            className={`px-3.5 py-1.5 border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-xs ${
              hasUnconfirmedChanges
                ? 'border-amber-600 bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                : 'border-[#165345] bg-[#1c6856] hover:bg-[#165345] text-white'
            }`}
            title="Confirmar y guardar todos los cambios de esta planilla y del personal en el sistema y en la nube"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{hasUnconfirmedChanges ? 'Confirmar Cambios ●' : 'Confirmar Cambios'}</span>
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
      {hasUnconfirmedChanges && (
        <div className="p-2.5 border-2 border-amber-400 bg-amber-50 text-amber-950 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              Tienes modificaciones en borrador. Presiona <strong>"Confirmar Cambios"</strong> para sincronizarlas oficialmente con el padrón de personal y la nube.
            </span>
          </div>
          <button
            onClick={handleSavePayroll}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-[10px] border border-amber-700 cursor-pointer"
          >
            Confirmar Ahora
          </button>
        </div>
      )}

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
              period === 'FIRST_HALF' ? '1ra Quincena (01 al 14)' : '2da Quincena (15 al Fin)',
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
          startDate={startDate}
          endDate={endDate}
          onAddIncident={handleAddIncident}
          onUpdateIncident={handleUpdateIncident}
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
